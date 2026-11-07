	return null;
}
/** a direction square to d, turned round it by a */
function round(d, a) {
	return new three.Vector3().crossVectors(d, Math.abs(d.y) > .95 ? v3(1, 0, 0) : UP).normalize().applyAxisAngle(d, a);
}
/** level and of unit length, or `or` when it has no level part */
function level(d, or = v3(1, 0, 0)) {
	const h = d.clone().setY(0);
	return h.lengthSq() < 1e-8 ? or.clone() : h.normalize();
}
/** a colour along stops ([t, colour], t rising), at t */
function ramp(stops, t) {
	if (t <= stops[0][0]) return new three.Color(stops[0][1]);
	for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
	return new three.Color(stops[stops.length - 1][1]);
}
/**
* Which way a leaf reaches so that its blade keeps out of the fruit: its bearing turned round the upright as little
* as it needs. Only when it would touch one does it look further.
* @param {Ball[]} balls @param {THREE.Vector3} p @param {THREE.Vector3} dir @param {number} len
*/
function clear(balls, p, dir, len) {
	if (!balls.length) return dir;
	const r = len * .24;
	const q = new three.Vector3();
	const cost = (d) => {
		let c = 0;
		for (const f of [.45, .95]) {
			q.copy(p).addScaledVector(d, len * f);
			for (const b of balls) {
				if (r + b.r - Math.abs(q.x - b.c.x) <= 0) continue;
				const into = r + b.r - q.distanceTo(b.c);
				if (into > 0) c += into;
			}
		}
		return c;
	};
	let best = dir, low = cost(dir);
	if (low === 0) return dir;
	for (const t of [
		.5,
		-.5,
		1,
		-1,
		1.6,
		-1.6,
		2.3,
		-2.3,
		3.1
	]) {
		const d = dir.clone().applyAxisAngle(UP, t);
		const c = cost(d);
		if (c < low) {
			low = c;
			best = d;
		}
		if (c === 0) break;
	}
