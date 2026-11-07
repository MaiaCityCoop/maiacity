/** a dome-shaped flushing crown, with a few of its numbers changed */
const crown = (o) => ({
	trunk: .8,
	trunkBorn: 1.6,
	trunkFlush: 1.4,
	scaffolds: [3, 4],
	scaffoldAngle: .8,
	gens: 6,
	flush: .28,
	rest: .27,
	shoot: (gen) => [
		0,
		1.15,
		.8,
		.58,
		.42,
		.34,
		.28
	][gen] ?? .28,
	whorl: [2, 3],
	spread: .6,
	up: .035,
	droop: .06,
	wander: .1,
	radius: .12,
	taper: .6,
	thicken: 4,
	bark: ["#7d6a4c", "#5a4a3e"],
	...o
});
