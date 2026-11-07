//#piece c36333644d05d97db85613f29ce74afc7ae0a75214ecf2e669f4236c74b91367
/** the Ochsenherz's stages: as tall as a person, few and huge fruit, later */
const OXHEART_STAGES = [
	{
		name: "Seed",
		day: 0,
		note: "A flat, hairy, beige seed, half a centimetre down: oxhearts are sown a few weeks before other tomatoes."
	},
	{
		name: "Germination",
		day: 6,
		note: "The radicle goes down; the hypocotyl hooks up through the soil."
	},
	{
		name: "Seed leaves",
		day: 11,
		note: "Two long narrow cotyledons on a hairy stem."
	},
	{
		name: "True leaves",
		day: 24,
		note: "The first compound leaves — already thinner and droopier than a round tomato’s."
	},
	{
		name: "Staked",
		day: 45,
		note: "Tied to a tall cane, slender and fast: its wispy leaves hang and twist, as if wilting. They are fine."
	},
	{
		name: "Flowering",
		day: 62,
		note: "The first truss opens, its first flower often a big double one: that becomes the largest fruit."
	},
	{
		name: "Fruit set",
		day: 72,
		note: "Only three to five fruit set per truss; each swells fast, already heart-shaped."
	},
	{
		name: "Green fruit",
		day: 92,
		note: "Heavy green hearts, broad-shouldered and ribbed, pulling the trusses down."
	},
	{
		name: "Breaker",
		day: 110,
		note: "About sixty-five days from the flower, the first heart blushes from its point up, its shoulders green the longest."
	},
	{
		name: "Ripe",
		day: 125,
		note: "Pink-red hearts of three or four hundred grams, meaty with few seeds; the stem nearly two metres high."
//#piece 1a7f21dc8fcafd514a1fc8a402c9651877f8c613a9b3db90ac5e81cbc03be248
/** an oxheart's leaflet: long and narrow, barely lobed, finely toothed */
function wispyShape(u) {
	const body = Math.pow(Math.sin(Math.PI * Math.pow(u, .85)), .9) * (1 - .25 * u);
	const lobes = u > .15 && u < .6 ? .08 * Math.max(0, Math.sin(u * Math.PI * 6)) : 0;
	const teeth = u > .1 && u < .95 ? u * 18 % 1 * .06 : 0;
	return body * (1 + lobes + teeth);
}
/** @type {Sort} */
const OXHEART = {
	height: [
		[2.1, 0],
		[3, .07],
		[4, .44],
		[5, .9],
		[6, 1.2],
		[7, 1.48],
		[8, 1.7],
		[9, 1.88]
	],
	stake: 2.15,
	leaflet: {
		length: .098,
		width: .026,
		shape: wispyShape
	},
	droop: .14,
	curl: .35,
	lift: [-.05, .25],
	fruits: [3, 3],
	fruit: (o) => heartFruit(o),
	setFor: 1.9,
	ripeFrom: 3.1,
	ripeFor: .6,
	double: true,
	truss: .17,
	balls: (at, dir, size, set) => {
		const R = .043 * size * lerp(.15, 1, set);
		return [{
			c: at.clone().addScaledVector(dir, .002 + R * .7),
			r: R * .98
		}, {
			c: at.clone().addScaledVector(dir, .002 + R * 1.5),
			r: R * .62
		}];
	}
};
/**
* The Ochsenherz at a stage (0 … 9) from the seed id.
* @param {number} g
* @param {string} seed
*/
const oxheart = (g, seed) => grow(OXHEART, g, seed);
//#piece dfc6bf6cc13e4f67b19a16d0a06419b6cc75b4a047582e77a8890ea921819956
* An oxheart: a big heart hanging point-down — broad shoulders under the calyx, deeply ribbed there, drawn down to a
* blunt point. Green, darkest at its shoulders; it ripens from the point up to a pinkish red, the shoulders last.
* @param {Fruit} o
*/
function heartFruit(o) {
	const bag = o.bag;
	const fr = chance(o.seed, "oxheart", ...o.key);
	const R = .043 * o.size * lerp(.15, 1, o.set);
	const H = R * between(fr, 1.9, 2.2);
	const ribs = 6 + Math.floor(fr() * 3);
	const lean = about(fr, 0, .12);
//#piece eeeeb9ab4a453bbb2c3046fffc75b713d50a32661cbfb1bc0cb16c5a8b684255
	const axis = [];
	for (let k = 0; k <= 18; k++) {
		const u = k / 18;
		axis.push(v3(lean * H * u * u, -.002 - u * H, 0));
	}
	const radius = (u, v) => {
		const body = u < .36 ? Math.pow(Math.sin(Math.PI / 2 * (u / .36)), .55) : Math.pow((1 - u) / .64, .8) * (1 - .15 * Math.sin(Math.PI * (u - .36) / .64));
		const rib = 1 + .1 * Math.cos(v * Math.PI * 2 * ribs) * Math.max(0, 1 - u * 1.6);
		return R * body * rib;
	};
	const colour = (u) => {
		const here = clamp(o.ripe * 1.5 - (1 - u) * .7);
		if (here <= 0) return mix("#3f7a2c", "#86b552", u * 1.1);
		return here < .4 ? mix("#8db352", "#e2914a", here / .4) : mix("#e2914a", "#d2414a", (here - .4) / .6);
	};
	bag.add("gloss", tube(axis, radius, (u) => colour(u), 24), m);
	for (let k = 0; k < 6; k++) {
		const sepal = sheet({
			length: .02 * o.size,
			width: .0024 * o.size,
			shape: (u) => Math.sin(Math.PI * Math.pow(u, .5)) * (1 - u * .5),
			lift: (u) => .12 * u + .2 * u * u,
			paint: () => "#4f7f2c",
			along: 6,
			across: 2
		});
		bag.add("sheet", sepal, m.clone().multiply(new three.Matrix4().makeRotationY(k / 6 * Math.PI * 2 + fr())).multiply(new three.Matrix4().makeRotationZ(-.2)));
	}
	bag.add("body", bead(v3(0, -.001, 0), v3(.0024, .0024, .0024), "#5c7f34"), m);
//#piece 69f1d3d6a1a9ba606895e988f6b2d3bf22c7c85e9e9f4295855e80951be3b7da
	id: "oxheart",
	label: "Oxheart tomato",
	latin: "Solanum lycopersicum · Ochsenherz",
	note: "A tall slender cordon, its wispy leaves hanging as if wilted; few, huge heart-shaped tomatoes to a truss, ribbed at the shoulders, ripening late to a pinkish red.",
	from: "Cordon · 125 days",
	stages: OXHEART_STAGES,
	grow: oxheart
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160
