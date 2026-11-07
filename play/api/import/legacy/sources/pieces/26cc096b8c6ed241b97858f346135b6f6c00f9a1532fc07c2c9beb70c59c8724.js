/** a rhubarb blade's reach at the angle a: roundly heart-shaped, the stalk in its notch, the margin wavy */
const rhubarbEdge = (a) => {
	const c = .45, rho = .72, s = Math.sin(a);
	const d = c * Math.cos(a) + Math.sqrt(rho * rho - c * c * s * s);
	const notch = 1 - .85 * Math.exp(-Math.pow((Math.abs(a) - Math.PI) / .3, 2));
	return d / 1.17 * notch * (1 + .04 * Math.sin(a * 13));
