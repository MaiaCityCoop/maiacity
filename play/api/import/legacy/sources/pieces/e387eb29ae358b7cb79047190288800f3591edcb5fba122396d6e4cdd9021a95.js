function vehicleSolver(V) {
	const E = V.engine;
	const iTot = (g) => V.gears[g - 1] * V.final;
	const tmax = (n) => table(E.rpm, E.nm, n);
	/** the engine's own friction (N·m): its friction mean effective pressure over its displacement, rising with speed */
	const tfric = (n) => E.fmep * (.7 + .15 * n / 1e3) * E.Vd / (4 * Math.PI);
	const rpmOf = (v, g) => v / V.r * iTot(g) * 60 / (2 * Math.PI);
	/** the most the wheels can be pushed in a gear at a speed (N) */
	const fMax = (g, v) => tmax(Math.max(rpmOf(v, g), E.launch)) * iTot(g) * V.eta / V.r;
	/** the mass as the road feels it in a gear: the wheels' and the engine's turning inertia added */
	const mEff = (m, g) => m + (V.wheels * V.Jw + E.J * iTot(g) ** 2 * V.eta) / V.r ** 2;
	const s = {
		v: 0,
		gear: 1,
		rpm: E.idle,
		theta: 0,
		Te: 0,
		Fd: 0,
		Fb: 0,
		a: 0,
		m: V.kerb,
		road: roadLoad({
			m: V.kerb,
			Crr: V.Crr,
			CdA: V.CdA
		}, 0, 0),
		Pw: 0,
		Pe: 0,
		fuel: 0,
		l100: 0,
		launch: false,
