/** the bottle's measures: 1 l, 7.7 cm across, its mouth 26.8 cm up (where water pours from), the cap to 30 cm */
const BOTTLE = {
	r: .0385,
	mouth: .268,
	top: .3
};
/** A 1 l refillable water bottle: powder-coated steel, a pale band round it, a screw cap with a carry loop. Standing
*  on its base; `userData.mouth` is where it pours from (its open neck, at the top), `userData.cap` the cap to take
*  off before pouring. */
function waterBottle() {
	const g = new three.Group();
	g.name = "water-bottle";
	const prof = [
		[0, 0],
		[.033, 0],
		[.0378, .004],
		[.0385, .012],
		[.0385, .2],
		[.035, .224],
		[.025, .243],
		[.018, .252],
		[.017, BOTTLE.mouth],
		[.0135, BOTTLE.mouth],
		[.0135, .25]
	].map(([r, y]) => new three.Vector2(r, y));
	const body = new three.Mesh(new three.LatheGeometry(prof, 36), m.bottle());
	body.castShadow = body.receiveShadow = true;
	g.add(body);
	const band = new three.Mesh(new three.CylinderGeometry(.0388, .0388, .06, 36, 1, true), m.bottleBand());
	band.position.y = .11;
	g.add(band);
	const hole = new three.Mesh(new three.CircleGeometry(.0135, 20).rotateX(-Math.PI / 2), m.mouth());
	hole.position.y = .251;
	g.add(hole);
	const cap = new three.Group();
	cap.name = "cap";
	const lid = new three.Mesh(new three.CylinderGeometry(.0205, .021, .026, 28), m.cap());
	lid.position.y = .012;
	const loop = new three.Mesh(new three.TorusGeometry(.012, .0035, 8, 20, Math.PI), m.cap());
	loop.position.y = .025;
	cap.add(lid, loop);
	cap.position.y = .257;
	cap.traverse((o) => o.isMesh && (o.castShadow = true));
	g.add(cap);
	g.userData = {
		mouth: new three.Vector3(0, BOTTLE.mouth, 0),
		cap
