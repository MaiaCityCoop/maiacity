//#piece 81e1848bc0f153d6150bee182488598f1e9394184f254db9d3ac92e8e41b6aec
//#piece 9376596ea7cea4369f22e6b089b016d946aeec342c8d5021f863c76d9c6f6213
/** a packet's size: 7 × 10 cm, a few seeds thick */
const PACKET = {
	w: 7 * CM,
	h: 10 * CM,
	d: 4 * MM
};
/** A patch of dug earth, `radius` m across its middle: turned soil a little heaped, crumbs and clods on it, a hollow in
*  its middle for the seed. It darkens and shines as it gets wet: `userData.setWet(k)` (0 dry … 1 soaked). Its own
*  material, so one patch wets alone. */
function dugEarth({ radius = .3, seed = 7 } = {}) {
	const g = new three.Group();
	g.name = "dug-earth";
	let s = seed;
	const rand = () => ((s = s * 16807 % 2147483647) - 1) / 2147483646;
	const dry = new three.Color("#7a5a3e"), wet = new three.Color("#3a2717");
	const mat = new three.MeshStandardMaterial({
		color: dry.clone(),
		roughness: .97,
		vertexColors: true
	});
	const ring = new three.RingGeometry(.001, radius * 1.15, 72, 14);
	const pos = ring.attributes.position, col = [];
	const phase = [
		0,
		0,
		0,
		0
	].map(() => rand() * Math.PI * 2);
	const ragged = (a) => .93 + .05 * Math.sin(3 * a + phase[0]) + .035 * Math.sin(5 * a + phase[1]) + .025 * Math.sin(9 * a + phase[2]) + .015 * Math.sin(17 * a + phase[3]);
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i), y = pos.getY(i), r = Math.hypot(x, y);
		const edge = radius * ragged(Math.atan2(y, x));
		const u = r / edge;
		const heap = u < 1 ? .04 * Math.sin(Math.PI * (.15 + .85 * u)) ** .8 : 0;
		const lump = u < .95 ? .007 * (rand() - .5) : 0;
		const h = Math.max(.004, heap + lump);
		pos.setXYZ(i, x * (u > 1 ? edge / r : 1), h, -y * (u > 1 ? edge / r : 1));
		const c = .82 + .3 * rand();
		col.push(c, c * (.96 + .06 * rand()), c * .95);
	}
	ring.setAttribute("color", new three.Float32BufferAttribute(col, 3));
	ring.computeVertexNormals();
	const ground = new three.Mesh(ring, mat);
	ground.receiveShadow = true;
	g.add(ground);
	for (let i = 0; i < 40; i++) {
		const a = rand() * Math.PI * 2, r = radius * (.25 + .85 * rand()) * (i < 10 ? 1.1 : .9);
		const size = .008 + .022 * rand() ** 2;
		const clod = new three.Mesh(new three.DodecahedronGeometry(size, 0), mat);
		clod.geometry.setAttribute("color", new three.Float32BufferAttribute(new Array(clod.geometry.attributes.position.count * 3).fill(.85), 3));
		clod.position.set(Math.cos(a) * r, .02 * Math.max(0, 1 - r / radius) + size * .5, Math.sin(a) * r);
		clod.rotation.set(rand() * 3, rand() * 3, rand() * 3);
		clod.scale.y = .6;
		clod.castShadow = true;
		g.add(clod);
	}
	const setWet = (k) => {
		const t = Math.max(0, Math.min(1, k));
		mat.color.copy(dry).lerp(wet, t);
		mat.roughness = .97 - .4 * t;
	};
	g.userData = {
		setWet,
		material: mat
	};
//#piece 6cdc5762c73bb286f714fbc6acd254fa986c6b14ef152c0e519354fa53a2303f
	id: "dug-earth",
	label: "Dug earth",
	note: "a patch of turned soil 60 cm across, heaped a little, crumbs and clods on it, a hollow for the seed; it darkens and shines as it is watered",
	usedIn: "MaiaCity V1",
	make: () => dugEarth()
//#piece 92ca3a7ad6eb1bbbcddfbc63ca5bc7e157e6fb6065a9e5cb6ca8b3e5176e382e
