	];
	return {
		flywheel: L(0, 262, 235),
		coupling: L(0, CPL, 235),
		fan: L(...FAN)
	};
}
/** the turns of a running cube's joints at time t (s): the engine (slowed to be seen) and the cooler's fan @param {number} t */
const powerCubeTurns = (t) => ({
	engine: t * 2 * Math.PI * 2.2,
	fan: t * 2 * Math.PI * 1.6
