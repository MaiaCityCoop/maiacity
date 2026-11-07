function footAt(g, m, leg, pace = 1) {
	const f = foot(g, m, leg);
	const sweep = g.stride * g.duty;
	if (f.stance) return {
		...f,
		z: sweep * (.5 - f.u) * pace,
		y: 0
	};
	const u = smooth(f.u);
	const up = Math.sin(Math.PI * Math.pow(f.u, .75));
	return {
		...f,
		z: sweep * (u - .5) * pace,
		y: g.lift * up * Math.min(1, pace * 2)
	};
}
/** a motion at a pace on the spot: for showing a gait where nothing moves the actor (the Actors gallery) */
const onTheSpot = (t, speed, m) => m ?? {
	dist: t * speed,
	speed
};
/** the body's rise and fall over a stride: twice per cycle (a walk's), or `per` times */
const bobOf = (g, m, at = 0, per = 2) => Math.cos(TAU * per * (m.dist / g.stride - at));
/** a chain's segments swaying as a wave runs down it: `amp` at the root growing by `grow` a segment, `lag` (rad) a segment */
function wave(names, t, freq, amp, axis, lag = .6, grow = 1.25) {
	const out = {};
	names.forEach((n, i) => {
		const r = [
			0,
