	const run = 3, period = kind === "people" ? 18 : 14;
	/** @type {Record<string, import('./rig').Clip>} */
	const clips = {
		shuttle: (t) => {
			const u = loop(t, period), h = .5;
