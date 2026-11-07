/** a folding camp chair facing +z: steel tubes crossed under the seat on either side, a canvas seat at 42 cm and
*  back, armrests */
function campChair() {
	const c = new three.Group();
	const v = (x, y, z) => new three.Vector3(x, y, z);
	const tube = (a, b) => {
		const t = rod(.011, m.leg(), 8);
		t.userData.span(a, b);
		c.add(t);
	};
	for (const sx of [-1, 1]) {
		const x = sx * .25;
		tube(v(x, 0, .22), v(x, .42, -.2));
		tube(v(x, 0, -.22), v(x, .42, .2));
		tube(v(x, .42, -.22), v(x, .9, -.34));
		tube(v(x, .42, .2), v(x, .62, .2));
		tube(v(x, .62, .2), v(x, .62, -.27));
		const pad = new three.Mesh(new three.BoxGeometry(.05, .016, .42), m.seat());
		pad.position.set(x, .635, -.03);
		c.add(pad);
	}
	tube(v(-.25, .42, .2), v(.25, .42, .2));
	tube(v(-.25, .42, -.21), v(.25, .42, -.21));
	const seat = new three.Mesh(new three.BoxGeometry(.5, .015, .42), m.seat());
	seat.position.y = .41;
	const back = new three.Mesh(new three.BoxGeometry(.5, .46, .012), m.seat());
	back.position.set(0, .67, -.285);
	back.rotation.x = -.245;
	c.add(seat, back);
	c.traverse((o) => o.isMesh && (o.castShadow = true));
	return c;
}
/** the fire place's measures: the stone ring's radius, the steps of building it (setBuild), the last one lighting it */
const FIRE_PLACE = {
	ring: .6,
	steps: {
		stones: [0, .28],
		woodpile: [.28, .5],
		logs: [.5, .68],
		chairs: [.68, .86],
		light: [.86, 1]
	}
};
const FIRE_ASSEMBLIES = [
	{
		id: "ring",
		label: "Fire ring",
		note: "Where the fire is kept: a ring of field stones round a bed of ash.",
		out: [
			0,
			0,
			0
		]
	},
	{
		id: "fire",
		label: "The fire",
		note: "Four logs over kindling in a tepee, and what burns.",
		out: [
			0,
			.9,
			0
		]
	},
	{
		id: "seats",
		label: "Chairs",
		note: "Two folding camp chairs facing the fire.",
		out: [
			0,
			0,
			0
		]
	},
	{
		id: "wood",
		label: "Woodpile",
		note: "Split logs stacked to dry, within reach of the fire.",
		out: [
			-.6,
			0,
			0
		]
	}
];
const FIRE_STEPS = [
	"Clear a round of earth and set a ring of stones round it, 1.2 m across.",
	"Stack the woodpile beside it, split logs three rows high.",
	"Lay four logs over the kindling in a tepee.",
	"Unfold the two chairs facing the fire.",
	"Light the kindling."
];
const FIRE_PARTS = [
	{
		id: "stones",
		label: "Stones",
		assembly: "ring",
		step: 1,
		count: 11,
		what: "Field stones the size of a loaf set round the fire, 1.2 m across: they keep the embers in and the grass out.",
		specs: [["Across", "1.2 m"], ["Stones", "about 30 cm"]]
	},
	{
		id: "ash",
		label: "Bed of ash",
		assembly: "ring",
		step: 1,
		what: "The bare earth inside the ring, grey with old ash; it glows where the embers lie.",
		moves: "Glows as the fire burns down"
	},
	{
		id: "logs",
		label: "Logs",
		assembly: "fire",
		step: 3,
		count: 4,
		what: "Four split logs, 80 cm long, leant together over the kindling so the air draws up through them.",
		specs: [["Long", "80 cm"], ["Round", "13 cm"]]
	},
	{
		id: "flames",
		label: "Flames",
		assembly: "fire",
		step: 5,
		what: "The fire itself and its light: warm, flickering, lighting the ground about 7 m round.",
		moves: "Flicker; grow when it is lit, die down when it is put out",
		specs: [["Light", "about 7 m round"]]
	},
	{
		id: "chairs",
		label: "Chairs",
		assembly: "seats",
		step: 4,
		count: 2,
		what: "Two green folding camp chairs, the seats at 40 cm, facing the fire.",
		moves: "Unfold",
		specs: [["Seat", "50 × 45 cm at 40 cm"]]
	},
	{
		id: "woodpile",
		label: "Woodpile",
		assembly: "wood",
		step: 2,
		count: 9,
		what: "Nine split logs 60 cm long, three rows of three on two bearers off the ground.",
		specs: [["Long", "60 cm"], ["Rows", "three"]]
	}
];
/**
* The fire place, built as far as `built` (0 … 1, its last step lighting it) and lit as much as `lit`. Its ring is at
* its origin; the chairs on its +z side, the woodpile on its −x side. userData:
* - setBuild(k), built; fire: { light, setLit(k), update(t) } (the flames and their flicker); tick(t) = fire.update
* - walk: { colliders: [{ x, z, r }] } (the ring, the chairs, the woodpile) with the Things viewer's walk in it
* - parts, catalog, explode(k)
*/
function firePlace({ built = 1, lit = 1 } = {}) {
	const { ring, steps } = FIRE_PLACE;
	const g = new three.Group();
	const parts = {};
	for (const { id } of FIRE_PARTS) {
		const p = new three.Group();
		p.name = id;
		p.userData.part = id;
		g.add(p);
		parts[id] = p;
	}
	/** a piece of a part, set down in its place as it is built */
	const set = (id) => {
		const c = new three.Group();
		parts[id].add(c);
		return c;
	};
	const stones = [];
	for (let k = 0; k < 11; k++) {
		const a = k / 11 * Math.PI * 2;
		const c = set("stones");
		const st = new three.Mesh(new three.DodecahedronGeometry(.17, 0), m.stone());
		st.position.set(Math.sin(a) * ring, .08, Math.cos(a) * ring);
		st.scale.set(1, .7, .9);
		st.rotation.set(k * .7, k * 1.3, k * .4);
		st.castShadow = st.receiveShadow = true;
		c.add(st);
		stones.push(c);
	}
	const ash = new three.Mesh(new three.CircleGeometry(ring - .08, 32).rotateX(-Math.PI / 2), m.ash());
	ash.position.y = .006;
	ash.receiveShadow = true;
	const embers = new three.MeshStandardMaterial({
		color: "#2a2522",
		roughness: 1,
		emissive: "#ff4a12",
		emissiveIntensity: 0
	});
	const glowBed = new three.Mesh(new three.CircleGeometry(.26, 24).rotateX(-Math.PI / 2), embers);
	glowBed.position.y = .009;
	parts.ash.add(ash, glowBed);
	const pile = [];
	{
		const at = new three.Vector3(-1.55, 0, -.2);
		for (const z of [-.2, .2]) {
			const c = set("woodpile");
			const b = new three.Mesh(new three.BoxGeometry(.5, .05, .06), m.bark());
			b.position.set(at.x, .025, at.z + z);
			c.add(b);
			pile.push(c);
		}
		for (let k = 0; k < 9; k++) {
			const c = set("woodpile");
			const log = new three.Mesh(new three.CylinderGeometry(.07, .07, .6, 7), [
				m.bark(),
				m.wood(),
				m.wood()
			]);
			log.rotation.x = Math.PI / 2;
			log.position.set(at.x - .15 + k % 3 * .15, .05 + .07 + Math.floor(k / 3) * .13, at.z);
			log.rotation.y = k % 2 * .3;
			log.castShadow = true;
			c.add(log);
			pile.push(c);
		}
	}
	const logs = [];
	for (let k = 0; k < 4; k++) {
		const c = set("logs");
		const log = new three.Mesh(new three.CylinderGeometry(.06, .07, .8, 8), [
			m.bark(),
			m.wood(),
			m.wood()
		]);
		log.rotation.set(Math.PI / 2 - .5, k / 4 * Math.PI, 0, "YXZ");
		log.position.y = .2;
		log.castShadow = true;
		c.add(log);
		logs.push(c);
	}
	const flameMat = new three.MeshStandardMaterial({
		color: "#ffb347",
		emissive: "#ff7a1a",
		emissiveIntensity: 2.2,
		transparent: true,
		opacity: .85
	});
	const flamesG = set("flames");
	const flames = [
		0,
		1,
		2
	].map((k) => {
		const f = new three.Mesh(new three.ConeGeometry(.16 - k * .03, .55 - k * .1, 8).translate(0, (.55 - k * .1) / 2, 0), flameMat);
		f.position.set((k - 1) * .08, .08, k % 2 * .06);
		flamesG.add(f);
		return f;
	});
	const light = new three.PointLight("#ff9a4a", 0, 7, 1.8);
	light.position.set(0, .6, 0);
	flamesG.add(light);
	const chairs = [];
	for (const [cx, cz, face] of [[
		-1.2,
		.6,
		2.1
	], [
		.9,
		1.1,
		-2.6
	]]) {
		const c = set("chairs");
		const chair = campChair();
		chair.position.set(cx, 0, cz);
		chair.rotation.y = face;
		c.add(chair);
		chairs.push(chair);
	}
	let want = clamp(lit);
	let flame = 0;
	function burn() {
		flame = want * ease(span(g.userData.built ?? 1, steps.light));
		flamesG.visible = flame > .01;
		light.intensity = 2 * flame;
		flameMat.opacity = .85 * Math.min(1, flame * 1.5);
		embers.emissiveIntensity = .9 * flame;
		for (const f of flames) f.scale.setScalar(.3 + .7 * flame);
	}
	/** lit as much as k (0 out … 1 burning) */
	function setLit(k) {
		want = clamp(k);
		g.userData.fire.lit = want;
		burn();
	}
	function update(t) {
		if (!flamesG.visible) return;
		flames.forEach((f, k) => {
			const s = (.85 + Math.sin(t * (9 + k * 3) + k) * .15) * (.3 + .7 * flame);
			f.scale.set(s, (.8 + Math.abs(Math.sin(t * (7 + k * 2))) * .4) * (.3 + .7 * flame), s);
		});
		light.intensity = (1.7 + Math.sin(t * 13) * .3 + Math.sin(t * 7.3) * .2) * flame;
	}
	let now = -1;
	function setBuild(k) {
		k = clamp(k);
		if (k === now) return;
		now = k;
		g.userData.built = k;
		const drop = (c, u) => {
			c.visible = u > 0;
			c.position.y = (1 - ease(u)) * .4;
		};
		const st = span(k, steps.stones);
		stones.forEach((c, i) => drop(c, turn(st, i, stones.length)));
		parts.ash.visible = st >= 1;
		const wp = span(k, steps.woodpile);
		pile.forEach((c, i) => drop(c, turn(wp, i, pile.length)));
		const lg = span(k, steps.logs);
		logs.forEach((c, i) => drop(c, turn(lg, i, logs.length)));
		const ch = span(k, steps.chairs);
		chairs.forEach((chair, i) => {
			const u = turn(ch, i, chairs.length);
			chair.parent.visible = u > 0;
			chair.position.y = (1 - ease(clamp(u / .4))) * .3;
			chair.scale.x = lerp(.12, 1, ease(clamp((u - .4) / .6)));
		});
		burn();
	}
	function explode(k) {
		for (const info of FIRE_PARTS) {
			const out = FIRE_ASSEMBLIES.find((a) => a.id === info.assembly).out;
			parts[info.id].position.set(out[0] * k, out[1] * k, out[2] * k);
		}
		parts.chairs.children.forEach((c, i) => {
			const [cx, cz] = i ? [.9, 1.1] : [-1.2, .6];
			const d = Math.hypot(cx, cz);
			c.position.set(cx / d * .6 * k, 0, cz / d * .6 * k);
		});
		parts.stones.children.forEach((c, i) => {
			const a = i / 11 * Math.PI * 2;
			c.position.x = Math.sin(a) * .35 * k;
			c.position.z = Math.cos(a) * .35 * k;
		});
	}
	const colliders = [
		{
			x: 0,
			z: 0,
			r: .75
		},
		{
			x: -1.2,
			z: .6,
			r: .4
		},
		{
			x: .9,
			z: 1.1,
			r: .4
		},
		{
			x: -1.55,
			z: -.2,
			r: .45
		}
	];
	g.userData = {
		built,
		setBuild,
		fire: {
			light,
			setLit,
			update,
			lit: want
		},
		tick: update,
		walk: {
			colliders,
			x: .2,
			z: 3.2,
			yaw: 0,
			canStand(x, z, _here, _ground, from) {
//#piece 7a6fb1e1852cc9a9874fcf96259c5ea8f273245acb1fc6d5dbc81169cdc9a77d
			assemblies: FIRE_ASSEMBLIES,
			parts: FIRE_PARTS,
			steps: FIRE_STEPS,
			ranges: Object.values(steps),
			sources: [{
				label: "Campfire (Wikipedia)",
				url: "https://en.wikipedia.org/wiki/Campfire"
			}],
			play: "Build it",
			seconds: 16
		}
	};
	setBuild(built);
