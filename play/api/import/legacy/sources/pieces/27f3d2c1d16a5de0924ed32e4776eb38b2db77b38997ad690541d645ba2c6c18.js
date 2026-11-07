/** a crown in flushes, finished by the spring it flowers: a few of its numbers changed */
const crown = (o) => ({
	trunk: .8,
	trunkBorn: 1.3,
	trunkFlush: 1.1,
	scaffolds: [3, 4],
	scaffoldAngle: .8,
	gens: 6,
	flush: .2,
	rest: .13,
	shoot: (gen) => [
		0,
		1.1,
		.8,
		.6,
		.45,
		.35,
		.28
	][gen] ?? .28,
	whorl: [2, 3],
	spread: .6,
	up: .035,
	droop: .06,
	wander: .12,
	radius: .12,
	taper: .6,
	thicken: 4,
	bark: ["#7d6a4c", "#5a4a3e"],
	...o
});
