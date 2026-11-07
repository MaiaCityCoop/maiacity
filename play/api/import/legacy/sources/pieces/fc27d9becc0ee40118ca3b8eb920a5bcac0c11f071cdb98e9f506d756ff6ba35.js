function frog(kind = "bullfrog") {
	const k = kind === "common" ? .7 : 1;
	const P = (x, y, z) => [
		x * k,
		y * k,
		z * k
	];
	const arm = [
		P(.024, .032, .03),
		P(.034, .016, .042),
		P(.03, .005, .058),
		P(.036, 0, .074)
	];
	const leg = [
		P(.018, .03, -.042),
		P(.052, .022, 0),
		P(.036, .012, -.056),
		P(.05, .005, -.014),
		P(.068, 0, .026)
	];
	const m = (p, x) => [
		p[0] * x,
		p[1],
		p[2]
	];
	const bones = [
		{
			name: "body",
			at: P(0, .035, -.005)
		},
		{
			name: "head",
			parent: "body",
			at: P(0, .042, .035)
		},
		{
			name: "throat",
			parent: "head",
			at: P(0, .022, .05)
		},
