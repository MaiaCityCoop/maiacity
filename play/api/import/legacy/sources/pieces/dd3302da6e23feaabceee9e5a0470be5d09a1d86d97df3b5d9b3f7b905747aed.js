//#piece 17499c420a648df7747b5bdc91cdad34478f702e3ee8c5f5f4402083df60d0c6
const BANANA_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Sucker",
		0,
		"A sword sucker cut from its mother’s corm, its narrow leaves upright, set in the soil."
	],
	[
		"Rooting",
		14,
		"Thick white roots break from the corm; the first leaf unrolls."
	],
	[
		"First leaves",
		40,
		"Narrow sword leaves, then broader ones, unrolling from the top one after the other."
	],
	[
		"Young plant",
		100,
		"A pseudostem of rolled leaf sheaths, the leaves broad paddles now."
	],
	[
		"Full grown",
		200,
		"Three metres of pseudostem, a crown of huge leaves torn into strips by the wind."
	],
	[
		"Shooting",
		270,
		"The flower stalk pushes up through the pseudostem and bends over, a purple bud at its end."
	],
	[
		"Hands",
		285,
		"Bract after bract lifts and falls, each baring a hand of small fingers that curve up toward the light."
	],
	[
		"Filling",
		330,
		"The fingers fill out, green and angular; the male bud hangs on below."
	],
	[
		"Colouring",
		365,
		"Full and rounded, the first hand yellowing."
	],
	[
		"Ripe",
		380,
		"A heavy bunch of yellow bananas; beside it the next sucker is already a young plant."
	]
]))();
/**
* Half a banana leaf's blade, from the midrib out to one side, torn into strips between its veins.
* @param {Bag} bag @param {{ at: THREE.Vector3, dir: THREE.Vector3, side: number, length: number, width: number, droop: number, colour: THREE.Color, dry: number, tears: number[], roll: number }} o
*/
function halfBlade(bag, o) {
	const cuts = [
		0,
		...o.tears,
		1
	];
	const shape = (u) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, .04 + u * .97))), .22);
	for (let k = 0; k < cuts.length - 1; k++) {
		const u0 = cuts[k] + (k ? .004 : 0), u1 = cuts[k + 1];
		const L = (u1 - u0) * o.length;
		const g = sheet({
			length: L,
			width: o.width,
			shape: (uu) => shape(u0 + uu * (u1 - u0)),
			lift: (uu, v) => (-o.droop * Math.pow(u0 + uu * (u1 - u0), 2) * o.length - .05 * ((v + 1) / 2) * o.width * (1 + o.dry * 3)) / Math.max(1e-6, L),
			paint: (uu, v) => o.colour.clone().lerp(new three.Color("#9ab86a"), Math.abs(Math.sin((u0 + uu * (u1 - u0)) * 160)) < .05 ? .25 : 0).lerp(new three.Color("#a8864a"), clamp(o.dry * 1.4 - (1 - (v + 1) / 2) * .5)),
			along: 4,
			across: 3
		});
		const p = g.attributes.position;
		for (let i = 0; i < p.count; i++) {
			const x = p.getX(i), z = p.getZ(i);
			const w = shape(u0 + x / Math.max(1e-6, L) * (u1 - u0)) * o.width;
			p.setXYZ(i, x + u0 * o.length, p.getY(i), o.side * (z + w) / 2);
		}
		g.computeVertexNormals();
		bag.add("sheet", g, aim(o.at, o.dir, o.roll));
	}
}
/**
