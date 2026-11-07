//#piece 9cdd83f192deb45a8343feb449b6888a5c058dc15b91b9cfc4ba9940379445c1
//#piece c29515fea7642cf7d919cf41a7e4fec9b7563cce1a65eff8cea8264aa7b64054
//#piece 9b684a38dba83cd57720584fa55cf3f119c07f76afae57fc29e99a550cee28cf
/** a direction tipped from straight up by `tilt` (radians) toward the compass bearing `turn` */
const heading = (tilt, turn) => v3(Math.sin(tilt) * Math.cos(turn), Math.cos(tilt), Math.sin(tilt) * Math.sin(turn));
//#piece f639181bd5324ac3aaee5c39f6817ba13518b2f198d69f72b20ebbfae5ff0051
//#piece 0041d75b8efdf018072dec0f7a34a4d1b21b17da71834fda7900c74e86235834
}
//#piece 8ec48d7cab369362a362ff8aa324fbf32cd477f421cfdf4ccdbc0792bbe4ce91
//#piece dd8180ffd665e991f38f0a627a2f62a499ca7031a79802c14140dd8469090e0a
//#piece 64f55215c6a55d5b9b7cd924998f878b3d3d74240133472701fa152a29fb36a1
*/
//#piece 61ef5fcc5e543b10d1feba84ff26054f7828d64f1841a6266a326eb7c2494e64
//#region src/lib/plants/strawberry.js
const STAGES = [
	{
		name: "Seed",
		day: 0,
		note: "An achene a millimetre long, sown on the soil, barely covered: strawberry seeds want light to sprout."
	},
	{
		name: "Germination",
		day: 12,
		note: "The radicle breaks out and turns down; the hypocotyl, bent in a hook, pushes up into the light."
	},
	{
		name: "Seed leaves",
		day: 20,
		note: "Two round cotyledons open on a stem a centimetre high; the root has its first laterals."
	},
	{
		name: "True leaves",
		day: 40,
		note: "The first trifoliate leaves, toothed, from between the seed leaves: the crown has begun."
	},
	{
		name: "Rosette",
		day: 75,
		note: "A crown of leaves on long stalks, the seed leaves gone, fibrous roots spreading from the crown."
	},
	{
		name: "Flowering",
		day: 110,
		note: "Trusses of white five-petalled flowers rise between the leaves, bees welcome."
	},
	{
		name: "Fruit set",
		day: 120,
		note: "The petals fall; behind each flower the receptacle swells into a small green berry, its seeds standing out."
	},
	{
		name: "Green berries",
		day: 130,
		note: "The berries fill out, still hard and green, their stalks bowing toward the soil; a runner sets out."
	},
	{
		name: "Turning",
		day: 140,
		note: "The first berries pale to white and blush red from the tip up; a daughter plant roots at the runner’s end."
	},
	{
		name: "Ripe",
		day: 150,
		note: "Berry after berry red and glossy, hanging on the straw: picking time."
	}
];
/** the stages as the plant grows them: flowering at 5, then the fruit's four stages over a longer stretch of growth */
const growth = (stage) => stage <= 5 ? stage : 5 + (stage - 5) * .65;
const SEED_AT = /* @__PURE__ */ (() => v3(0, -.0022, 0))();
const LEAVES = 16;
const ROOTS = 22;
const TRUSSES = 6;
/** the leaves' births: the first slowly, one after the other, then a new one every few days */
const leafBirth = (i) => i === 0 ? 2 : i === 1 ? 2.45 : i === 2 ? 2.85 : 3.1 + (i - 3) * .18;
/**
* The strawberry at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} stage
* @param {string} seed
*/
function strawberry(stage, seed) {
	const g = growth(stage);
	const bag = new Bag();
	/** what is where: the berries, so that none grows through another */
	const space = bag.space;
	const r = chance(seed, "plant");
	const vigour = about(r, 1, .12);
	const crown = sprout(bag, {
		seed,
		at: SEED_AT,
		size: v3(65e-5, 42e-5, 42e-5),
		coat: "#b98a3e",
		coatShade: "#8a6a3a",
		stem: table(g, [
			[0, 0],
			[.35, 4e-4],
			[1, .0052],
			[2, .011],
			[3, .012],
			[4.2, .0045],
			[6, .0045]
		]),
		hook: table(g, [
			[0, 1],
			[1, 1],
			[1.6, 0]
		]),
		radius: 28e-5 + 6e-4 * span(g, 2, 4),
		stemColor: "#8fa84a",
		leaf: {
			length: .0055,
			width: .0026,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .75)), .7),
			color: "#5f9a3b",
			vein: "#9cc46e"
		},
		open: span(g, 1.15, 2),
		shed: span(g, 1, 1.7),
		wither: span(g, 3.3, 4.3)
	}).top.clone();
	if (g > 2.4) {
		const c = span(g, 2.4, 6);
		bag.add("body", bead(crown.clone().add(v3(0, -.001 * c, 0)), v3(1, 1.25, 1).multiplyScalar(.0012 + .0065 * c * vigour), mix("#8a9a4a", "#6e4b32", c)));
	}
	root(bag, {
		seed,
		key: ["radicle"],
		from: SEED_AT.clone(),
		dir: v3(.05, -1, .02),
		length: .2,
		grown: table(g, [
			[0, 0],
			[.4, .004],
			[1, .06],
			[2, .16],
			[3, .35],
			[4, .7],
			[6, 1]
		]),
		radius: 35e-5 + 6e-4 * span(g, 2, 5),
		down: .05,
		wander: .2,
		laterals: 9,
		lateral: .3,
		depth: 2,
		age: span(g, 2.5, 5),
		young: "#f6f0de",
		old: "#9c6f45"
	});
	for (let i = 0; i < ROOTS; i++) {
		const rr = chance(seed, "crown-root", i);
		const born = 2.6 + i * .13 + rr() * .1;
		const tilt = between(rr, .25, 1.15);
		const bear = rr() * Math.PI * 2;
		const d = v3(Math.sin(tilt) * Math.cos(bear), -Math.cos(tilt), Math.sin(tilt) * Math.sin(bear));
		root(bag, {
			seed,
			key: ["crown", i],
			from: crown.clone().add(v3(d.x * .003, -.002, d.z * .003)),
			dir: d,
			length: between(rr, .12, .24) * vigour,
			grown: (g - born) / 2.2,
			radius: .001,
			down: .06,
			wander: .28,
			laterals: 7,
			lateral: .28,
			depth: 2,
			age: (g - born - .8) / 2.5,
			young: "#f3ead2",
			old: "#7a5232"
		});
	}
	for (let i = 0; i < LEAVES; i++) {
		const born = leafBirth(i);
		if (g <= born) break;
		const lr = chance(seed, "leaf", i);
		const size = lerp(.22, 1, clamp((born - 2) / 2.2)) * about(lr, 1, .12) * vigour;
		const bear = i * 2.39996 + about(lr, 0, .35);
		const tiltTo = between(lr, .45, 1.1);
		const grown = clamp((g - born) / .9);
		const wither = born < 3.05 ? span(g, 4.3 + i * .35, 5.5 + i * .35) : 0;
		if (wither >= 1) continue;
		trifoliate(bag, {
			seed,
			key: ["leaf", i],
			at: crown,
			size,
			bear,
			tilt: lerp(.08, tiltTo, grown) + wither * .7,
			grown,
			wither,
			scale: 1
		});
	}
	for (let j = 0; j < TRUSSES; j++) {
		const tr = chance(seed, "truss", j);
		const born = 4.1 + j * .16 + tr() * .1;
		if (g <= born) continue;
		truss(bag, {
			seed,
			key: j,
			at: crown,
			born,
			g,
			bear: tr() * Math.PI * 2,
			tilt: between(tr, .35, .75),
			vigour,
			space
		});
	}
	if (g > 5.05) runner(bag, seed, crown, g, vigour);
	return bag.build();
}
/** the leaflet's outline: broadest above the middle, wedge-shaped at its base, toothed from a third of the way out */
function leaflet(u) {
	return Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .72) * (1 + (u > .3 && u < .97 ? u * 13 % 1 * .11 : 0));
}
/**
* A strawberry leaf: a long hairy stalk, reddish at its foot, and three leaflets at its top, folded along their
* midribs while young, then spread flat and pleated.
* @param {Bag} bag
* @param {{ seed: string, key: (string | number)[], at: THREE.Vector3, size: number, bear: number, tilt: number, grown: number, wither: number, scale: number }} o
*/
function trifoliate(bag, o) {
	const lr = chance(o.seed, ...o.key, "shape");
	const len = .14 * o.size * o.scale * lerp(.25, 1, o.grown);
	const droop = between(lr, .15, .45) + o.wither * .8;
	const pts = [];
	let d = heading(o.tilt, o.bear);
	let p = o.at.clone();
	const out = v3(Math.cos(o.bear), 0, Math.sin(o.bear));
	const steps = 10;
	for (let k = 0; k <= steps; k++) {
		pts.push(p.clone());
		d = d.clone().addScaledVector(out, droop * .12 * k / steps).addScaledVector(v3(0, -1, 0), droop * .06 * k / steps).normalize();
		p = p.clone().addScaledVector(d, len / steps);
	}
	const top = pts[steps];
	const rad = (5e-4 + 7e-4 * o.size) * o.scale;
	const brown = o.wither;
	bag.add("body", tube(pts, (u) => rad * (1 - .3 * u), (u) => mix(mix("#8a3b2c", "#6f9a3a", clamp(u * 3)), "#a8743a", brown), 5));
	const leafLen = .072 * o.size * o.scale * lerp(.3, 1, o.grown);
	const fold = (1 - o.grown) * .95 + .06 + o.wither * .3;
	const pitch = lerp(1.1, between(lr, -.05, .25), o.grown) - o.wither * .6;
	const young = 1 - clamp(o.grown * 1.3);
	for (const k of [
		-1,
		0,
		1
	]) {
		const turn = o.bear + k * between(lr, .85, 1.05);
		const horiz = v3(Math.cos(turn), 0, Math.sin(turn));
		const dir = horiz.multiplyScalar(Math.cos(pitch)).add(v3(0, Math.sin(pitch), 0)).normalize();
		const l = leafLen * (k === 0 ? 1 : .92);
		const blade = sheet({
			length: l,
			width: l * .42,
			shape: leaflet,
			lift: (u, v) => fold * Math.abs(v) * .32 - .07 * u * u - .012 * Math.abs(Math.sin(u * Math.PI * 9)) * Math.abs(v),
			paint: (u, v) => {
				const vein = Math.abs(v) < .08 ? .45 : Math.abs(Math.sin(u * Math.PI * 9)) < .15 && Math.abs(v) < .8 ? .15 : 0;
				const green = mix(mix("#2f6a26", "#6aa846", young), "#a9cf7c", vein);
				return o.wither ? green.lerp(mix("#c4542e", "#d1a43a", u), clamp(o.wither * 1.4)) : green;
			},
			along: 52,
			across: 6
		});
		const at = top.clone().addScaledVector(horiz, k === 0 ? .004 * o.size : .001);
		bag.add("sheet", blade, aim(at, dir));
	}
}
/**
* A truss: a stalk from the crown that forks into a few flowers, the first and largest opening first; each flower
* sheds its petals and swells into a berry, its stalk bowing over as the berry grows heavy.
* @param {Bag} bag
* @param {{ seed: string, key: number, at: THREE.Vector3, born: number, g: number, bear: number, tilt: number, vigour: number, space: Space }} o
*/
function truss(bag, o) {
	const tr = chance(o.seed, "truss-shape", o.key);
	const g = o.g;
	const grown = clamp((g - o.born) / .6);
	const heavy = span(g, o.born + .9, o.born + 1.6);
	const len = .13 * o.vigour * lerp(.3, 1, grown) * about(tr, 1, .15);
	const out = v3(Math.cos(o.bear), 0, Math.sin(o.bear));
	let d = heading(o.tilt + heavy * .5, o.bear);
	let p = o.at.clone();
	const pts = [];
	const steps = 10;
	for (let k = 0; k <= steps; k++) {
		pts.push(p.clone());
		d = d.clone().addScaledVector(out, .03 + heavy * .07).addScaledVector(v3(0, -1, 0), heavy * .09 * (k / steps)).normalize();
		p = p.clone().addScaledVector(d, len / steps);
		p.y = Math.max(p.y, .004);
	}
	bag.add("body", tube(pts, (u) => .0014 * (1 - .35 * u), (u) => mix("#7e3a2a", "#7aa040", clamp(u * 2.5)), 5));
	const fork = pts[steps];
	const tip = pts[steps].clone().sub(pts[9]).normalize();
	const flowers = 3 + Math.floor(tr() * 3);
	for (let k = 0; k < flowers; k++) {
		const fr = chance(o.seed, "flower", o.key, k);
		const opens = o.born + .3 + k * .1 + fr() * .05;
		const big = k === 0 ? 1 : k < 3 ? .78 : .6;
		const spread = k === 0 ? 0 : between(fr, .5, 1);
		const side = new three.Vector3().crossVectors(tip, v3(0, 1, 0)).normalize().applyAxisAngle(tip, fr() * Math.PI * 2);
		const pdir = tip.clone().applyAxisAngle(side, spread).normalize();
		const plen = (k === 0 ? .025 : .04) * lerp(.4, 1, grown);
		const fruitT = span(g, opens + .5, opens + 1.4);
		const hang = clamp(span(g, opens + .35, opens + .9) * 1.1);
		const ppts = [];
		let pd = pdir.clone();
		let pp = fork.clone();
		for (let m = 0; m <= 6; m++) {
			ppts.push(pp.clone());
			pd = pd.clone().lerp(v3(0, -1, 0), hang * .18).normalize();
			pp = pp.clone().addScaledVector(pd, plen / 6);
			pp.y = Math.max(pp.y, .005);
		}
		const stalk = tube(ppts, () => 7e-4 * big, () => "#7fa548", 4);
		const end = ppts[6];
		const facing = ppts[6].clone().sub(ppts[5]).normalize();
		if (g < opens) {
			bag.add("body", stalk);
			const b = clamp((g - o.born) / (opens - o.born));
			bag.add("body", bead(end.clone().addScaledVector(facing, .002), v3(1, 1, 1).multiplyScalar(.0015 + .0025 * b * big), mix("#7fae4a", "#dfe6c0", b * .5)));
		} else if (g < opens + .55 || fruitT <= .02) {
			bag.add("body", stalk);
			bloom(bag, FLOWER, end, facing, big, clamp((g - opens) / .2), span(g, opens + .35, opens + .55));
		} else {
			const dir = facing.clone().lerp(v3(0, -1, 0), .75 + hang * .2).normalize();
			const room = (end.y - .002) / (.036 * big * o.vigour);
			if (-dir.y > room) {
				const flat = v3(dir.x, 0, dir.z);
				if (flat.lengthSq() < 1e-6) flat.copy(side);
				flat.normalize().multiplyScalar(Math.sqrt(1 - Math.max(0, room) ** 2));
				dir.set(flat.x, -Math.max(0, room), flat.z).normalize();
			}
			const L = .036 * big * o.vigour * lerp(.18, 1, fruitT);
			const place = o.space.settle(end, dir, (a, d) => [{
				c: a.clone().addScaledVector(d, L * .42),
				r: L * .46
			}], .012);
			bag.fruit([o.key, k], fork, place.dir);
			bag.add("body", stalk);
			if (place.at.distanceTo(end) > 1e-5) bag.add("body", tube([end, place.at], () => 7e-4 * big, () => "#7fa548", 4));
			berry(bag, {
				seed: o.seed,
				key: [o.key, k],
				at: place.at,
				dir: place.dir,
				size: big * o.vigour,
				grown: fruitT,
				ripe: span(g, opens + 1.4, opens + 2)
			});
			bag.fruitDone();
		}
	}
}
/** a strawberry flower: five white round petals, the green sepals behind them, a yellow cushion of pistils ringed by the stamens */
const FLOWER = {
	petals: 5,
	length: .012,
	width: .0062,
	colour: "#f3efe2",
	heart: "#d9cf47"
};
/**
* A berry: the swollen receptacle hanging from its green calyx, its achenes (the true seeds) on the outside. It
* grows green, turns white, then red from the tip up.
* @param {Bag} bag
* @param {{ seed: string, key: (string | number)[], at: THREE.Vector3, dir: THREE.Vector3, size: number, grown: number, ripe: number }} o
*/
function berry(bag, o) {
	const br = chance(o.seed, "berry", ...o.key);
	const L = .036 * o.size * lerp(.18, 1, o.grown) * about(br, 1, .1);
	const R = L * between(br, .42, .52);
	const bend = about(br, 0, .08);
	const radius = (u) => R * Math.pow(Math.sin(Math.PI * Math.min(1, .16 + u * .84)), .62) * (1 - .3 * u) * Math.pow(clamp(u / .06), .5);
	const q = new three.Quaternion().setFromUnitVectors(v3(0, -1, 0), o.dir.clone().normalize());
	const m = new three.Matrix4().compose(o.at, q, v3(1, 1, 1));
	/** @type {THREE.Vector3[]} */
	const axis = [];
	for (let k = 0; k <= 16; k++) {
		const u = k / 16;
		axis.push(v3(bend * L * u * u, -u * L, 0));
	}
	const colour = (u) => {
		const here = clamp(o.ripe * 1.7 - (1 - u) * .7);
		return here < .4 ? mix("#9cc25a", "#eeead0", here / .4) : mix("#eeead0", "#c4142b", (here - .4) / .6);
	};
	bag.add("gloss", tube(axis, radius, (u) => colour(u), 14), m);
	const n = Math.round(60 + 90 * o.size);
	for (let k = 0; k < n; k++) {
		const u = .1 + .86 * ((k + .5) / n);
		const a = k * 2.39996;
		const at = v3(bend * L * u * u + Math.cos(a) * radius(u) * .98, -u * L, Math.sin(a) * radius(u) * .98);
		const s = Math.max(35e-5, L * .018);
		bag.add("body", bead(at, v3(s, s * 1.3, s), o.ripe > .5 ? "#c99a32" : mix("#8fb04a", "#e2c34a", o.ripe * 2), 2), m);
	}
	for (let k = 0; k < 10; k++) {
		const sepal = sheet({
			length: (k % 2 ? .007 : .01) * o.size,
			width: .002 * o.size,
			shape: (u) => Math.sin(Math.PI * Math.pow(u, .6)) * (1 - u * .5),
			lift: (u) => .12 * u + o.ripe * .25 * u * u,
			paint: (u) => mix("#4f7f2c", "#6f9c3e", u),
			along: 6,
			across: 2
		});
		bag.add("sheet", sepal, m.clone().multiply(new three.Matrix4().makeRotationY(k / 10 * Math.PI * 2)).multiply(new three.Matrix4().makeRotationZ(-.35 - o.grown * .4)));
	}
}
/**
* A runner: a thin reddish stolon arching out along the soil, and at its end a daughter plant putting down roots.
* @param {Bag} bag @param {string} seed @param {THREE.Vector3} crown @param {number} g @param {number} vigour
*/
function runner(bag, seed, crown, g, vigour) {
	const rr = chance(seed, "runner");
	const bear = rr() * Math.PI * 2;
	const grown = span(g, 5.05, 5.85);
	const reach = .3 * vigour * grown;
	const out = v3(Math.cos(bear), 0, Math.sin(bear));
	const side = v3(-out.z, 0, out.x);
	const wiggle = about(rr, 0, .12);
	const pts = [];
	for (let k = 0; k <= 16; k++) {
		const u = k / 16;
		const p = crown.clone().addScaledVector(out, u * reach).addScaledVector(side, Math.sin(u * Math.PI) * wiggle * reach);
		p.y = crown.y + Math.sin(u * Math.PI) * .035 * grown * (1 - u * .4) + (.003 - crown.y) * u;
		pts.push(p);
	}
	bag.add("body", tube(pts, () => .0011, (u) => mix("#9c3f33", "#b4593f", u), 5));
	const end = pts[16];
	const daughter = span(g, 5.5, 6);
	if (daughter <= 0) {
		bag.add("body", bead(end, v3(1, 1, 1).multiplyScalar(.002), "#7f9a44"));
		return;
	}
	bag.add("body", bead(end, v3(1, 1.2, 1).multiplyScalar(.0025 + .002 * daughter), "#7e8a40"));
	for (let i = 0; i < 3; i++) {
		if (daughter < i * .3) break;
		trifoliate(bag, {
			seed,
			key: ["daughter", i],
			at: end,
			size: .35,
			bear: bear + i * 2.4,
			tilt: .3,
			grown: clamp((daughter - i * .3) / .6),
			wither: 0,
			scale: .8
		});
	}
	for (let i = 0; i < 5; i++) {
		const a = i / 5 * Math.PI * 2;
		root(bag, {
			seed,
			key: ["daughter", i],
			from: end.clone().add(v3(0, -.001, 0)),
			dir: v3(Math.cos(a) * .4, -1, Math.sin(a) * .4),
			length: .04,
			grown: daughter,
			radius: 7e-4,
			laterals: 3,
			depth: 1,
			young: "#f6efdc",
			old: "#c79d6c"
		});
	}
//#piece 69f1d3d6a1a9ba606895e988f6b2d3bf22c7c85e9e9f4295855e80951be3b7da
	id: "strawberry",
	label: "Strawberry",
	latin: "Fragaria × ananassa",
	note: "From an achene on the soil to a rosette in fruit with a runner: trifoliate toothed leaves, white flowers, berries ripening from the tip.",
	from: "Rosette · 150 days",
	stages: STAGES,
	grow: strawberry
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160
