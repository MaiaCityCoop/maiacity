	}
//#piece 8f637eaa845a100a375e4e2faf3128accbcd3a2ba452b7ebf416f6be2cb827a6
//#piece e777f6830599f2532d07d28c414d7d027b1c1f192ab13057aa6e69a3a7663aa2
//#piece f489fcc946f05c2e6a509d343d562a04ecfeebed5a412009522b33ba4aedf467
//#piece 93f85297e591963cd48a9ea0d2e9fd4d7149fb7f4ce432dfa69cf444cf660c7e
* A berry at `c`, if there is room for it there (none of the plant's fruit or berries in the way): its skin, and the
* dark remains of its flower at its foot.
* @param {Site} s @param {THREE.Vector3} c @param {number} r @param {THREE.Color} colour @param {THREE.Vector3} down where its flower end faces
* @param {{ crown?: string, long?: number, gloss?: boolean, detail?: number }} [o]
*/
function berry(s, c, r, colour, down, o = {}) {
	if (s.grid.depth(c, r) > r * .2) return false;
	s.grid.add(c, r);
	const turn = new three.Quaternion().setFromUnitVectors(UP, down.clone().negate());
	s.bag.add(o.gloss === false ? "body" : "gloss", bead(c, v3(r, r * (o.long ?? 1), r), colour, o.detail ?? 3, turn));
	if (o.crown) s.bag.add("body", bead(c.clone().addScaledVector(down, r * (o.long ?? 1) * .92), v3(r * .35, r * .18, r * .35), o.crown, 2, turn));
	return true;
