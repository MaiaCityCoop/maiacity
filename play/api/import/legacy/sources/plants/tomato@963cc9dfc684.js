//#piece c36333644d05d97db85613f29ce74afc7ae0a75214ecf2e669f4236c74b91367
/** the round garden tomato's stages */
const STAGES = [
	{
		name: "Seed",
		day: 0,
		note: "A flat, hairy, beige seed three millimetres across, half a centimetre down in warm soil."
	},
	{
		name: "Germination",
		day: 5,
		note: "The radicle goes down; the hypocotyl arches up through the soil, the seed coat still on the seed leaves."
	},
	{
		name: "Seed leaves",
		day: 10,
		note: "Two long narrow cotyledons open on a hairy purple-green stem."
	},
	{
		name: "True leaves",
		day: 21,
		note: "The first compound leaves, their leaflets ragged and lobed, smelling of tomato when touched."
	},
	{
		name: "Staked",
		day: 40,
		note: "Planted out and tied to a cane: a leaf at every node, the stem thickening, roots from the buried stem."
	},
	{
		name: "Flowering",
		day: 55,
		note: "The first truss of nodding yellow stars opens; more trusses follow every three leaves."
	},
	{
		name: "Fruit set",
		day: 65,
		note: "The petals wither; small green tomatoes swell on the first truss, the next truss in flower."
	},
	{
		name: "Green fruit",
		day: 80,
		note: "Trusses of hard green tomatoes, full-sized below, smaller above; the lowest leaves yellow."
	},
	{
		name: "Breaker",
		day: 92,
		note: "The first truss breaks colour from the blossom end: yellow, orange, blushing red."
	},
	{
		name: "Ripe",
		day: 105,
		note: "Red trusses from the bottom up, green ones still swelling at the top: picking time."
//#piece 1a7f21dc8fcafd514a1fc8a402c9651877f8c613a9b3db90ac5e81cbc03be248
/** the tomato's leaflet: ovate, pointed, its edge cut into a few rounded lobes and toothed */
function leafletShape(u) {
	const body = Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .75);
	const lobes = u > .12 && u < .82 ? .16 * Math.max(0, Math.sin(u * Math.PI * 5.2)) : 0;
	const teeth = u > .1 && u < .95 ? u * 15 % 1 * .07 : 0;
	return body * (1 + lobes + teeth);
}
/** @type {Sort} */
const ROUND = {
	height: [
		[2.1, 0],
		[3, .06],
		[4, .38],
		[5, .78],
		[6, 1.02],
		[7, 1.22],
		[8, 1.38],
		[9, 1.5]
	],
	stake: 1.75,
	leaflet: {
		length: .088,
		width: .042,
		shape: leafletShape
	},
	droop: 0,
	curl: 0,
	lift: [.25, .55],
	fruits: [4, 4],
	fruit: (o) => roundFruit(o),
	setFor: 1.5,
	ripeFrom: 2.8,
	ripeFor: .6,
	double: false,
	truss: .11,
	balls: (at, dir, size, set) => {
		const R = .027 * size * lerp(.15, 1, set);
		return [{
			c: at.clone().addScaledVector(dir, .002 + R * .85),
			r: R * .98
		}];
	}
};
/**
* The round garden tomato at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g
* @param {string} seed
*/
const tomato = (g, seed) => grow(ROUND, g, seed);
//#piece dfc6bf6cc13e4f67b19a16d0a06419b6cc75b4a047582e77a8890ea921819956
* A tomato: round, flattened a little, softly ribbed, glossy; green, darker at its shoulders, then from the blossom
* end yellow-orange (the breaker) and red. Its calyx a green star at its top.
* @param {Fruit} o
*/
function roundFruit(o) {
	const bag = o.bag;
	const fr = chance(o.seed, "tomato", ...o.key);
	const R = .027 * o.size * lerp(.15, 1, o.set);
	const H = R * between(fr, 1.55, 1.8);
	const ribs = 5 + Math.floor(fr() * 3);
//#piece eeeeb9ab4a453bbb2c3046fffc75b713d50a32661cbfb1bc0cb16c5a8b684255
	const axis = [];
	for (let k = 0; k <= 14; k++) axis.push(v3(0, -.002 - k / 14 * H, 0));
	const colour = (u) => {
		const here = clamp(o.ripe * 1.6 - (1 - u) * .6);
		if (here <= 0) return mix("#4f8a32", "#7fae4a", u * 1.2);
		return here < .45 ? mix("#86b04a", "#e9a43a", here / .45) : mix("#e9a43a", "#d42c1a", (here - .45) / .55);
	};
	bag.add("gloss", tube(axis, (u, v) => R * Math.pow(Math.max(0, Math.sin(Math.PI * u)), .55) * (1 + .04 * Math.cos(v * Math.PI * 2 * ribs) * Math.sin(Math.PI * u)), (u) => colour(u), 18), m);
	for (let k = 0; k < 6; k++) {
		const sepal = sheet({
			length: .013 * o.size,
			width: .0018 * o.size,
			shape: (u) => Math.sin(Math.PI * Math.pow(u, .5)) * (1 - u * .5),
			lift: (u) => .1 * u + .15 * u * u,
			paint: () => "#4f7f2c",
			along: 6,
			across: 2
		});
		bag.add("sheet", sepal, m.clone().multiply(new three.Matrix4().makeRotationY(k / 6 * Math.PI * 2 + fr())).multiply(new three.Matrix4().makeRotationZ(-.25)));
	}
	bag.add("body", bead(v3(0, -.001, 0), v3(.0018, .0018, .0018), "#5c7f34"), m);
//#piece 69f1d3d6a1a9ba606895e988f6b2d3bf22c7c85e9e9f4295855e80951be3b7da
	id: "tomato",
	label: "Tomato",
	latin: "Solanum lycopersicum",
	note: "From a flat hairy seed to a staked cordon: ragged compound leaves, trusses of nodding yellow stars, tomatoes ripening truss by truss from green through orange to red.",
	from: "Cordon · 105 days",
	stages: STAGES,
	grow: tomato
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160
