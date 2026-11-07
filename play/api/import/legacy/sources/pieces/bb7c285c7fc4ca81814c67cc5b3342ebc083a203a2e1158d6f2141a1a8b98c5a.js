/** how far a site's fruit has set and ripened, from its phase: set from 0.55, colouring from `from` over `over` */
const fruiting = (phase, from = 2.6, over = 1.2, setFor = 1.6) => ({
	set: span(phase, .55, .55 + setFor),
	ripe: span(phase, from, from + over)
});
