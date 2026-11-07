	const { j, tail } = q;
	const seed = life.seed ?? 1;
	const tl = life.tail ?? {
		sway: .15,
		carry: 0,
		hz: 1.2
	};
	const earSwing = life.ears ?? .4;
	/** what every pose has: the tail, the ears' flicks, a breath */
	const living = (t, moving) => {
		const p = wave(tail, t, tl.hz * (1 + moving), tl.sway * (.6 + moving), tl.axis ?? 1, .7, 1.2);
		tail.forEach((n, i) => p[n][0] += tl.carry / tail.length * (i ? 1 : .5));
		const flick = now(t, 2.8, .35, seed + 3), turn = wander(t, 3.5, seed + 9);
		const f = flick >= 0 ? Math.sin(Math.PI * flick) : 0;
		p.earL = [
			earSwing * (.25 * turn - .5 * f),
