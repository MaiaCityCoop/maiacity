*/
//#piece 70800341da83776310eb4b033ea7bb914fb1e6a98e315d805ea2ed751cb1a204
/** a thin sharp spine or prickle out of the bark: a cone along `dir`, bent at its tip by `hook` */
function prickle(bag, at, dir, len, base, colour, hook = 0) {
	const mid = at.clone().addScaledVector(dir, len * .55);
	const tip = mid.clone().addScaledVector(dir, len * .45).add(v3(0, -hook * len, 0));
	bag.add("body", tube([
		at,
		mid,
		tip
	], (u) => base * (1 - .95 * u), () => colour, 3));
}
