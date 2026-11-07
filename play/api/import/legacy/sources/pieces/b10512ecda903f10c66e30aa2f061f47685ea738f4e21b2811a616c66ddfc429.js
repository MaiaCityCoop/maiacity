/** A solar panel: one 1.72 × 1.13 m monocrystalline panel, about 410 W, on a galvanised ground rack tilted 30° to the sun, its cable down to the ground. */
function solarPanel() {
	const g = new three.Group();
	g.name = "solar-panel";
	const tilt = Math.PI / 6;
	const low = .5, half = 1.13 / 2;
	pvPanel(g, 0, low + half * Math.sin(tilt), 0, tilt);
	const front = half * Math.cos(tilt), high = low + 1.13 * Math.sin(tilt);
	for (const x of [-.7, .7]) {
