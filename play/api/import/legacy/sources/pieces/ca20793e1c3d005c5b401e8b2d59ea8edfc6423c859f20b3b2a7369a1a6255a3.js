/** A fire extinguisher on its bracket, 6 kg, its back at z 0, its foot at y 0. */
function extinguisher() {
	const g = new three.Group();
	drum(g, .08, .5, m.red(), 0, 0, .09);
	drum(g, .03, .06, m.black(), 0, .5, .09);
	bar(g, v3(0, .56, .09), v3(.12, .5, .12), .008, m.black());
	part(g, .1, .05, .02, m.black(), 0, .35, .01);
	return g;
}
