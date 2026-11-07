	const g = new three.BoxGeometry(r * .12, r * 1.8, r * .2);
	g.rotateX(a);
	g.translate(x, y, z);
	return g;
}
/**
* A backhoe's bucket on its pivot: a curled back plate between two side plates, its back to the outside (+z) and its
* mouth and teeth turned towards the machine, the teeth carrying on round the curl from its lip; the ears to its
* ram's pin.
* @param {{ pivot: V3, R: number, w: number, teeth: number, pin: V3, plate?: number }} o
* @returns {Piece[]}
*/
