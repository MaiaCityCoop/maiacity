//#piece 123cf38622aeb4248f11af19543b57a8d426be9297cafc2430f2a1fdc9f3009f
//#piece c356e4be87757d22deb8e41aad1a8104fea4b1fdb91c5abe4e604f047fbc044b
//#piece d77232df1f18f16c04aef0b0545db7a7821513e115b976c1ede124c4f5e17f66
//#piece 415ee1bd5b7ab8b4b1581e9291af120d9777ed6c7dea08835392c9432e2afa77
*/
//#piece 86993bfbd68d9315ca761f8d585450f2508288f96af25506669667ebc307a572
//#region src/lib/machines/powercube.js
/** @typedef {[number, number, number]} V3 */
/** the cube: 27" each way, its 4×4 skids' height */
const CUBE = {
	W: .686,
	L: .66,
	H: .686,
	B: .1016
};
/** the crank's line (x 0, y, along z) and the plane the two cylinders stand in */
const CRANK = {
	y: .235,
	z: .03
};
/** the engine: bore, stroke, rod (m), displacement (m³), its cylinders' angle from upright (rad) */
const ENGINE = /* @__PURE__ */ (() => ({
	bore: .0838,
	stroke: .0734,
	rod: .116,
	Vd: 81e-5,
	bank: Math.PI / 4,
	deck: .186
}))();
/** the pump: displacement (m³ a turn), its gears (teeth, module, width), the idler above the drive */
const PUMP = {
	D: 16e-6,
	teeth: 12,
	module: .0025,
	width: .034,
	z0: -.232
};
