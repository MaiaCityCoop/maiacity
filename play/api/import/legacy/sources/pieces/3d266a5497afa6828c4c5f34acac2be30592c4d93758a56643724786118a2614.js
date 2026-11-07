* A small hanging bell (a gooseberry's, a haskap's): a cone from where its stalk meets it, widening to its mouth,
* opening, then shrivelling as it falls.
* @param {Bag} bag @param {THREE.Vector3} at @param {THREE.Vector3} down @param {number} len @param {number} mouth
* @param {string} colour @param {string} lip @param {number} open @param {number} fall
*/
function bell(bag, at, down, len, mouth, colour, lip, open, fall) {
	const l = len * lerp(.5, 1, open) * (1 - fall * .4);
	const pts = [
		0,
		.4,
		.8,
		1
	].map((t) => at.clone().addScaledVector(down, l * t));
	bag.add("body", tube(pts, (u) => mouth * lerp(.3, 1, Math.pow(u, .8)) * lerp(.5, 1, open) * (1 - fall * .5), (u) => mix(colour, lip, u * u), 6));
}
