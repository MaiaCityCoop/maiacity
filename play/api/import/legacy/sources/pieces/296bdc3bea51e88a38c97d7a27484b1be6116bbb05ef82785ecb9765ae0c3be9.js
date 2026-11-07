	}
//#piece 8f637eaa845a100a375e4e2faf3128accbcd3a2ba452b7ebf416f6be2cb827a6
//#piece e777f6830599f2532d07d28c414d7d027b1c1f192ab13057aa6e69a3a7663aa2
//#piece f489fcc946f05c2e6a509d343d562a04ecfeebed5a412009522b33ba4aedf467
//#piece 93f85297e591963cd48a9ea0d2e9fd4d7149fb7f4ce432dfa69cf444cf660c7e
* A fruit swept along its axis from `at` down `dir`: `shape(u, v)` its radius (0 … 1) along and round it, `bend` how
* far its axis bows to one side (a pawpaw's kidney).
* @param {Bag} bag
* @param {{ at: THREE.Vector3, dir: THREE.Vector3, L: number, W: number, shape: (u: number, v: number) => number,
*   paint: (u: number, v: number) => THREE.Color, sides: number, rings: number, gloss: boolean, turn: number, bend?: number }} o
*/
function fruitBody(bag, o) {
	const m = new three.Matrix4().compose(o.at, new three.Quaternion().setFromUnitVectors(DOWN, o.dir.clone().normalize()).multiply(new three.Quaternion().setFromAxisAngle(UP, o.turn)), v3(1, 1, 1));
	const axis = [];
	for (let k = 0; k <= o.rings; k++) {
		const u = k / o.rings;
		axis.push(v3((o.bend ?? 0) * o.L * Math.sin(Math.PI * u), -.001 - u * o.L, 0));
	}
	bag.add(o.gloss ? "gloss" : "body", tube(axis, (u, v) => o.W * o.shape(u, v), o.paint, o.sides), m);
	return m;
}
/**
* A big fruit hanging from a site: a place found for it clear of the wood and the other fruit (`grid`), its stalk,
* and its body. Hands back its matrix, its length and girth, for anything more on it (an eye, a calyx). It starts
* the fruit's mark (`Bag.fruit`): the caller ends it (`fruitDone`) once it has drawn the rest of it.
* @param {Site} s @param {number} k
* @param {{ L: number, W: number, stalk: number, shape: (u: number, v: number) => number, paint: (u: number, v: number) => THREE.Color,
*   gloss: boolean, set: number, sides?: number, rings?: number, bend?: number, out?: number, stalkColour?: string }} F
