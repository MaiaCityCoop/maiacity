//#piece 028d9c8b164630a319390e36ae83ada6c4bbc3b6b56e9d610c597b765b99e4a4
//#piece e6addcd9c9c95232e424cd25cec49ab74a452a00e42d368c6faf0d1544719c86
const MAT = /* @__PURE__ */ (() => ({
	strut: col("#8a6040", .8),
	log: col("#b98a5a", .75),
	darkLog: col("#7a5434", .85),
//#piece 4830a2a7ce2681eca2736ca42baba26681280c20966748ed8e8c562cf5c17031
	oak: col("#a8774c", .8),
	straw: col("#d8c38a", 1),
	hay: col("#cdb874", 1),
	grass: col("#7f9a52", 1),
	sand: col("#e3cf9c", 1),
	steel: new three.MeshStandardMaterial({
		color: "#9aa0a2",
		roughness: .35,
		metalness: .7
	}),
	rope: col("#d8c8a0", 1),
	slide: new three.MeshStandardMaterial({
		color: "#d9b36a",
		roughness: .4,
		side: three.DoubleSide
	}),
	egg: col("#e9dcc6", .55),
	brownEgg: col("#c79a6a", .55),
//#piece c5e449c2a1207f8e6a512cb7dfee19ea2b757021a4f6c1876a4e6d838ae81df1
//#piece 93c53f72cab935027802111d5a88b3d3800f0e65f5ec5ea869650a506edc8dd9
function log$1(g, a, b, r, mat = MAT.log) {
//#piece a2cd9ec3a84d2dd055a3070228718984b66eea8c9e649d529072e622ed272efd
	g.add(m);
	return m;
}
const v$1 = (x, y, z) => new three.Vector3(x, y, z);
//#piece 7083519d8371b44c4c8e464b2fc27651967c4b5aaa7a12e270ca262bd689aad3
}
/**
* The play dome: a sandpit ringed with stumps round a climbing dome of round logs, a platform in it and a slide out
* of its side; a swing on an arch of logs; balance logs and stepping stumps. About 16 m across.
* @param {number} [seed] @returns {Space}
*/
function playDome(seed = 90) {
	const r = seeded$1(seed);
	const g = new three.Group();
	/** @type {Collider[]} */
	const cs = [];
	floor(g, 4.2, MAT.sand);
	for (let i = 0; i < 18; i++) {
		const a = i / 18 * Math.PI * 2;
		const stump = new three.Mesh(new three.CylinderGeometry(.2, .22, .35 + r() * .25, 10), MAT.darkLog);
		stump.position.set(Math.sin(a) * 4.3, .2, Math.cos(a) * 4.3);
		stump.castShadow = true;
		g.add(stump);
	}
	const T = {
		x: -1.1,
		z: -.7,
		R: 2.2
	};
	const climber = new three.Group();
	climber.position.set(T.x, 0, T.z);
	dome(climber, T.R, 2, .95, .045, MAT.log, (c, R) => c.y > R * .82 ? MAT.rope : null);
	const deck = new three.Mesh(new three.CylinderGeometry(1.25, 1.25, .08, 20), MAT.oak);
	deck.position.y = 1.2;
	deck.castShadow = true;
	climber.add(deck);
	for (const [sx, sz] of [
		[-.7, -.7],
		[.7, -.7],
		[-.7, .7],
		[.7, .7]
	]) log$1(climber, v$1(sx, 0, sz), v$1(sx, 1.2, sz), .06, MAT.darkLog);
	g.add(climber);
	const slidePath = new three.CatmullRomCurve3([
		v$1(T.x + 1, 1.2, T.z + .2),
		v$1(T.x + 2.4, .75, T.z + .1),
		v$1(T.x + 3.6, .22, T.z + .35)
	]);
	const chute = new three.Mesh(new three.TubeGeometry(slidePath, 20, .4, 10, false), MAT.slide);
	chute.scale.y = .6;
	chute.position.y = .2;
	g.add(chute);
	cs.push({
		x: T.x,
		z: T.z,
		r: T.R
	});
	const S = {
		x: 2,
		z: 2.3,
		w: 1.5,
		h: 2.4
	};
	const arch = new three.CatmullRomCurve3([
		v$1(S.x - S.w, 0, S.z),
		v$1(S.x - S.w * .85, S.h * .8, S.z),
		v$1(S.x, S.h, S.z),
		v$1(S.x + S.w * .85, S.h * .8, S.z),
		v$1(S.x + S.w, 0, S.z)
	]);
	const beam = new three.Mesh(new three.TubeGeometry(arch, 30, .09, 8, false), MAT.log);
	beam.castShadow = true;
	g.add(beam);
	for (const sx of [-1, 1]) log$1(g, v$1(S.x + sx * S.w, 0, S.z - .7), v$1(S.x + sx * S.w * .9, 1.4, S.z), .06, MAT.darkLog);
	for (const sx of [-.45, .45]) {
		const top = arch.getPoint(.5 + sx / (S.w * 4.4));
		for (const dz of [-.18, .18]) log$1(g, v$1(S.x + sx, top.y - .05, S.z + dz * .2), v$1(S.x + sx, .55, S.z + dz), .012, MAT.rope);
		box(g, .22, .05, .5, MAT.oak, S.x + sx, .5, S.z, Math.PI / 2);
	}
	cs.push({
		x: S.x - S.w,
		z: S.z,
		r: .5
	}, {
		x: S.x + S.w,
		z: S.z,
		r: .5
	});
	for (let i = 0; i < 3; i++) {
		const a = 3.6 + i * .5;
		log$1(g, v$1(Math.sin(a) * 5.2, .25, Math.cos(a) * 5.2), v$1(Math.sin(a + .35) * 6.8, .25, Math.cos(a + .35) * 6.8), .15, MAT.darkLog);
	}
	for (let i = 0; i < 7; i++) {
		const a = .9 + i * .28, h = .2 + i * .08;
		const st = new three.Mesh(new three.CylinderGeometry(.28, .3, h, 12), MAT.log);
		st.position.set(Math.sin(a) * 6.2, h / 2, Math.cos(a) * 6.2);
		st.castShadow = true;
		g.add(st);
	}
	g.traverse((o) => {
		const m = o;
		if (m.isMesh) m.receiveShadow = true;
	});
	return {
		group: g,
		colliders: cs
	};
}

//#endregion
//#piece b30e60cb55271dc5cac9cc6aa0873afc41bfbe3f36158c8f0f340a77152331d8
*/
const wood = /* @__PURE__ */ (() => new three.MeshStandardMaterial({
	color: "#b98a5a",
	roughness: .75
}))();
const darkWood = /* @__PURE__ */ (() => new three.MeshStandardMaterial({
	color: "#8a6040",
	roughness: .8
}))();
const rope = /* @__PURE__ */ (() => new three.MeshStandardMaterial({
	color: "#d8c8a0",
	roughness: 1
}))();
const sand = /* @__PURE__ */ (() => new three.MeshStandardMaterial({
	color: "#e3cf9c",
	roughness: 1
}))();
/** A log: a round timber from a to b. */
function log(g, a, b, r, mat = wood) {
//#piece a2cd9ec3a84d2dd055a3070228718984b66eea8c9e649d529072e622ed272efd
	g.add(m);
}
const v = (x, y, z) => new three.Vector3(x, y, z);
/**
* A wooden playground: a sandpit ring of logs, a climbing tower with a tent roof
* and a slide, a two-seat swing, balance logs and stepping stumps. About 16 m across.
*/
function playground(seed) {
	const r = seeded(seed);
	const g = new three.Group();
	const cs = [];
	const pit = new three.Mesh(new three.CircleGeometry(4.2, 40), sand);
	pit.rotation.x = -Math.PI / 2;
	pit.position.y = .03;
	g.add(pit);
	for (let i = 0; i < 18; i++) {
		const a = i / 18 * Math.PI * 2;
		const stump = new three.Mesh(new three.CylinderGeometry(.2, .22, .35 + r() * .25, 10), darkWood);
		stump.position.set(Math.sin(a) * 4.3, .2, Math.cos(a) * 4.3);
		g.add(stump);
	}
	const T = {
		x: -1.2,
		z: -.8,
		h: 1.6
	};
	for (const [sx, sz] of [
		[-1, -1],
		[1, -1],
		[-1, 1],
		[1, 1]
	]) log(g, v(T.x + sx * .8, 0, T.z + sz * .8), v(T.x + sx * .8, T.h + 1.6, T.z + sz * .8), .09);
	g.add(new three.Mesh(new three.CylinderGeometry(1.15, 1.15, .1, 24), wood).translateX(T.x).translateY(T.h).translateZ(T.z));
	const roof = new three.Mesh(new three.ConeGeometry(1.35, 1, 4), new three.MeshStandardMaterial({
		color: "#c9623f",
		roughness: .9
	}));
	roof.position.set(T.x, T.h + 2.1, T.z);
	roof.rotation.y = Math.PI / 4;
	g.add(roof);
	for (let i = 0; i < 5; i++) log(g, v(T.x - .8, .3 + i * .3, T.z + 1.1), v(T.x + .8, .3 + i * .3, T.z + 1.1), .03);
	for (const sx of [-.8, .8]) log(g, v(T.x + sx, 0, T.z + 1.1), v(T.x + sx, T.h, T.z + .8), .05);
	const slidePath = new three.CatmullRomCurve3([
		v(T.x + .9, T.h, T.z),
		v(T.x + 2.2, T.h * .6, T.z - .3),
		v(T.x + 3.4, .25, T.z - .2)
	]);
	const chute = new three.Mesh(new three.TubeGeometry(slidePath, 20, .4, 10, false), new three.MeshStandardMaterial({
		color: "#d9b36a",
		roughness: .4,
		side: three.DoubleSide
	}));
	chute.scale.y = .6;
	chute.position.y = .25;
	g.add(chute);
	cs.push({
		x: T.x,
		z: T.z,
		r: 1.3
	});
	const S = {
		x: 1.8,
		z: 2.2
	};
	for (const sx of [-1.4, 1.4]) {
		log(g, v(S.x + sx, 0, S.z - .8), v(S.x + sx, 2.4, S.z), .08);
		log(g, v(S.x + sx, 0, S.z + .8), v(S.x + sx, 2.4, S.z), .08);
	}
	log(g, v(S.x - 1.5, 2.4, S.z), v(S.x + 1.5, 2.4, S.z), .09);
	for (const sx of [-.6, .6]) {
		for (const dz of [-.18, .18]) log(g, v(S.x + sx + dz, 2.4, S.z), v(S.x + sx + dz, .55, S.z), .012, rope);
		g.add(new three.Mesh(new three.BoxGeometry(.5, .05, .22), wood).translateX(S.x + sx).translateY(.53).translateZ(S.z));
	}
	cs.push({
		x: S.x - 1.4,
		z: S.z,
		r: .6
	}, {
		x: S.x + 1.4,
		z: S.z,
		r: .6
	});
	for (let i = 0; i < 3; i++) {
		const a = 3.6 + i * .5;
		log(g, v(Math.sin(a) * 5.2, .25, Math.cos(a) * 5.2), v(Math.sin(a + .35) * 6.8, .25, Math.cos(a + .35) * 6.8), .15, darkWood);
	}
	for (let i = 0; i < 7; i++) {
		const a = .9 + i * .28;
		const st = new three.Mesh(new three.CylinderGeometry(.28, .3, .2 + i * .08, 12), wood);
		st.position.set(Math.sin(a) * 6.2, (.2 + i * .08) / 2, Math.cos(a) * 6.2);
		g.add(st);
	}
	g.traverse((o) => o.isMesh && (o.castShadow = true, o.receiveShadow = true));
	return {
		group: g,
		colliders: cs
	};
}

//#endregion
//#piece 6fa14bc9f71080dc6eed4f7571b8ed4b1ae2d47f88bfd3f617bd036efba60f78
//#piece a82d348033c0e2e5c29e2c2f5ba33bbf468baf2d5afc2fc78837317361b6a78f
const HISTORY = /* @__PURE__ */ (() => ({ playground: [{
	...FIRST,
	build: () => playground(90).group
}, {
	v: 2,
	date: "2026-10-06",
	note: "A climbing dome of round logs with a platform and a slide at its middle; the swing on an arch of logs"
}] }))();
const LIST = /* @__PURE__ */ (() => [{
	id: "playground",
	label: "Playground",
	note: "about 16 m across, all wood: a sandpit ringed with stumps round a climbing dome of round logs (4.4 m across, a platform at 1.2 m, a rope net under its crown, a slide out of its side), a swing on an arch of logs, balance logs and stepping stumps",
	usedIn: "Sandbox 4",
	make: () => playDome().group
//#piece 92ca3a7ad6eb1bbbcddfbc63ca5bc7e157e6fb6065a9e5cb6ca8b3e5176e382e
